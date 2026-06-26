FROM tomcat:8.5-jre8

ENV JAVA_OPTS="-Xms1024m -Xmx2048m \
    -Djava.awt.headless=true \
    -Dfile.encoding=UTF-8 \
    -XX:+UseG1GC \
    -XX:MaxGCPauseMillis=200"

ENV TZ=Asia/Seoul

# 데이터 및 로그 폴더 경로 생성
RUN mkdir -p /data/docker/apps/aman

# 기본 ROOT 웹앱 삭제
RUN rm -rf $CATALINA_HOME/webapps/ROOT

# 컨텍스트 내의 aman.war 파일을 톰캣 경로로 복사
COPY aman.war $CATALINA_HOME/webapps/aman.war

EXPOSE 8080

CMD ["catalina.sh", "run"]
